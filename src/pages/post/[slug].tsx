import { GetStaticPaths, GetStaticProps } from 'next';
import { RichText } from 'prismic-dom';

import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';
import Header from '../../components/Header';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url?: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return (
      <p
        style={{
          position: 'absolute',
          top: '50%',
          bottom: '50%',
          left: '50%',
          right: '50%',
        }}
      >
        Carregando...
      </p>
    );
  }

  const { first_publication_date, data } = post;

  const { author, content, banner, title } = data;

  const dateFormated = format(
    new Date(first_publication_date),
    "dd MMM' 'yyyy",
    {
      locale: ptBR,
    }
  );

  const average_reading_time_calc = content.reduce((acc, c) => {
    const textBody = RichText.asText(c.body);
    const split = textBody.split(' ');
    const number_words = split.length;

    const result = Math.ceil(number_words / 200);
    return acc + result;
  }, 0);

  const averageString = String(average_reading_time_calc);

  return (
    <>
      <Header />
      <div>
        <img src={banner.url} alt="Banner" />
        <div>
          <strong>{title}</strong>
          <div>
            <span>{author}</span>
            <span>{dateFormated}</span>
            <span>{`${averageString} min`}</span>
          </div>
          {content.map(section => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              <div
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(section.body),
                }}
              />
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 10,
      fetch: ['posts.uid'],
    }
  );

  const slugsArray = postsResponse.results.map(post => ({
    params: { slug: post.uid },
  }));

  return {
    paths: slugsArray,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const prismic = getPrismicClient();
  const { slug } = params;
  const response = await prismic.getByUID('posts', String(slug), {});

  const content = response.data.group.map(section => {
    return {
      heading: section.heading,
      body: [...section.body],
    };
  });

  const post = {
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content,
    },
  };

  if (!response) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return {
    props: { post },
    redirect: 60 * 30,
  };
};
